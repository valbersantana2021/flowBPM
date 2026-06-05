import { NextResponse } from 'next/server'

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um especialista em modelagem de processos BPMN 2.0.
Quando o usuário descrever um processo, gere um diagrama BPMN completo e válido.

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE com JSON válido contendo dois campos: "xml" e "message"
2. "xml": XML BPMN 2.0 completo com coordenadas de layout (BPMNDiagram/BPMNShape/BPMNEdge)
3. "message": explicação amigável em português do que foi criado/alterado
4. Nomeie todos os elementos em português brasileiro
5. Inclua sempre: startEvent, endEvent, pelo menos uma task, flows corretamente ligados
6. Para edições: preserve o que não foi pedido para alterar
7. Use IDs únicos com prefixo (ex: StartEvent_1, Task_aprovacao, Gateway_decisao)
8. O XML deve estar completo com namespace e BPMNDiagram com coordenadas reais

ELEMENTOS SUPORTADOS:
Tasks: task, userTask, serviceTask, sendTask, receiveTask, businessRuleTask, manualTask, scriptTask
Gateways: exclusiveGateway, parallelGateway, inclusiveGateway
Events: startEvent, endEvent, intermediateThrowEvent, intermediateCatchEvent (timer/message)

NÃO USE: pools, lanes

FORMATO DE RESPOSTA (JSON puro, sem markdown, sem backticks):
{"xml": "<?xml version=\"1.0\"...>...</definitions>", "message": "Criado processo com..."}`

// ─── Helper: strip code fences that models sometimes add ─────────────────────
function cleanJson(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

// ─── Gemini (Google AI Studio) ────────────────────────────────────────────────
// Model: gemini-2.0-flash (fast, cheap, great quality)
// Docs: https://ai.google.dev/api/generate-content
async function callGemini(
  message: string,
  history: Array<{ role: string; content: string }>,
  currentXml: string | null
): Promise<{ xml: string; message: string }> {
  const apiKey = process.env.GEMINI_API_KEY!
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite'

  console.log(`[generate-bpmn] Using Gemini model: ${model}`)

  // Build final user text (inject currentXml so the model knows the state)
  const userText = currentXml
    ? `${message}\n\nXML atual do diagrama:\n${currentXml}`
    : message

  // Gemini uses "model" for assistant role (not "assistant")
  // History must alternate user/model, starting with user
  const contents = [
    ...history.slice(-10).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userText }] },
  ]

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  }

  // Use v1beta — required for system_instruction and responseMimeType
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!rawText) throw new Error('Gemini retornou resposta vazia')

  return JSON.parse(cleanJson(rawText))
}

// ─── Anthropic (Claude) ───────────────────────────────────────────────────────
async function callAnthropic(
  message: string,
  history: Array<{ role: string; content: string }>,
  currentXml: string | null
): Promise<{ xml: string; message: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY!

  const userContent = currentXml
    ? `${message}\n\nXML atual do diagrama:\n${currentXml}`
    : message

  const messages = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)

  const data = await res.json()
  const rawText: string =
    data.content?.[0]?.type === 'text' ? data.content[0].text : ''
  return JSON.parse(cleanJson(rawText))
}

// ─── OpenAI (GPT-4o) ────────────────────────────────────────────────────────────
async function callOpenAI(
  message: string,
  history: Array<{ role: string; content: string }>,
  currentXml: string | null
): Promise<{ xml: string; message: string }> {
  const apiKey = process.env.OPENAI_API_KEY!
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

  const userContent = currentXml
    ? `${message}\n\nXML atual do diagrama:\n${currentXml}`
    : message

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.4,
      response_format: { type: 'json_object' }, // forces JSON output
      messages,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)

  const data = await res.json()
  const rawText: string = data.choices?.[0]?.message?.content ?? ''
  return JSON.parse(cleanJson(rawText))
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function generateMockBpmn(message: string): { xml: string; message: string } {
  const id = () => Math.random().toString(36).slice(2, 9)
  const s1 = `StartEvent_${id()}`
  const t1 = `Task_${id()}`
  const t2 = `Task_${id()}`
  const e1 = `EndEvent_${id()}`
  const f1 = `Flow_${id()}`
  const f2 = `Flow_${id()}`
  const f3 = `Flow_${id()}`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://flowmind.ai/bpmn"
             id="Definitions_1">
  <process id="Process_1" isExecutable="false">
    <startEvent id="${s1}" name="Início">
      <outgoing>${f1}</outgoing>
    </startEvent>
    <task id="${t1}" name="Executar Tarefa 1">
      <incoming>${f1}</incoming>
      <outgoing>${f2}</outgoing>
    </task>
    <task id="${t2}" name="Executar Tarefa 2">
      <incoming>${f2}</incoming>
      <outgoing>${f3}</outgoing>
    </task>
    <endEvent id="${e1}" name="Fim">
      <incoming>${f3}</incoming>
    </endEvent>
    <sequenceFlow id="${f1}" sourceRef="${s1}" targetRef="${t1}"/>
    <sequenceFlow id="${f2}" sourceRef="${t1}" targetRef="${t2}"/>
    <sequenceFlow id="${f3}" sourceRef="${t2}" targetRef="${e1}"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="${s1}_di" bpmnElement="${s1}">
        <dc:Bounds x="152" y="82" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="155" y="125" width="29" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="${t1}_di" bpmnElement="${t1}">
        <dc:Bounds x="250" y="60" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="${t2}_di" bpmnElement="${t2}">
        <dc:Bounds x="430" y="60" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="${e1}_di" bpmnElement="${e1}">
        <dc:Bounds x="612" y="82" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="618" y="125" width="23" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="${f1}_di" bpmnElement="${f1}">
        <di:waypoint x="188" y="100"/>
        <di:waypoint x="250" y="100"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="${f2}_di" bpmnElement="${f2}">
        <di:waypoint x="370" y="100"/>
        <di:waypoint x="430" y="100"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="${f3}_di" bpmnElement="${f3}">
        <di:waypoint x="550" y="100"/>
        <di:waypoint x="612" y="100"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

  return {
    xml,
    message: `⚠️ **Modo demo** — nenhuma chave de IA configurada.\n\nGerado um diagrama de exemplo para: "${message}"\n\nPara usar a IA real, adicione **GEMINI_API_KEY** ou **ANTHROPIC_API_KEY** no \`.env.local\`.`,
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { message, history = [], currentXml } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    // Priority: Gemini → Anthropic → OpenAI → Mock
    if (process.env.GEMINI_API_KEY) {
      const result = await callGemini(message, history, currentXml)
      return NextResponse.json(result)
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const result = await callAnthropic(message, history, currentXml)
      return NextResponse.json(result)
    }

    if (process.env.OPENAI_API_KEY) {
      const result = await callOpenAI(message, history, currentXml)
      return NextResponse.json(result)
    }

    // No key configured — return demo diagram
    await new Promise((r) => setTimeout(r, 800))
    return NextResponse.json(generateMockBpmn(message))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[generate-bpmn]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
