import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    coinbaseWallet({
      appName: "0xPixel",
      appLogoUrl: "https://0xnothing.xyz/icon.svg",
      version: "4",
    }),
    injected(),
  ],
  transports: {
    [mainnet.id]: http(alchemyUrl),
    [sepolia.id]: http(alchemyUrl),
  },
});
