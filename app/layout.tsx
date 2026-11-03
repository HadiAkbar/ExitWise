import './style.css';
import AppFrame from './components/app-frame';
export const metadata={title:'ExitWise | Plan a possible investment sale',description:'See what selling individual investments could provide when you need liquidity. Compare estimates before deciding.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppFrame>{children}</AppFrame></body></html>}
