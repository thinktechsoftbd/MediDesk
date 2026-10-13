// @ts-ignore — the stylesheet is bundled by Next.js at runtime.
import "./globals.css";
import AppToaster from "@/components/app-toaster";
export const metadata={title:"Mohonto Dental Care",description:"Dental clinic management system"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<AppToaster/></body></html>}
