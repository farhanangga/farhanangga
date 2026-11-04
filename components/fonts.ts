import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });
export const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"] });
