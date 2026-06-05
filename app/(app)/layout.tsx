import { Topbar } from '@/components/layout/Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
        {children}
      </div>
    </>
  )
}
