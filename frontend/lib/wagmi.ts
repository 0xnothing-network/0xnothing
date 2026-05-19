import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;

if (!alchemyUrl) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_URL is not set. Copy .env.example to .env and fill in your values.");
}

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "0xPixel" }),
  ],
  transports: {
    [mainnet.id]: http(alchemyUrl),
  },
});
