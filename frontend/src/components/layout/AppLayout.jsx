import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar'; // we'll create this next

export default function AppLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-[#FFF7EC] via-[#F3F6EA] to-[#EFF3E4]">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Sidebar trigger (hamburger) is inside the sidebar itself, or you can put it in the header */}
          <div className="p-4">
            <SidebarTrigger className="lg:hidden" />
          </div>
          <div className="px-6 pb-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}