import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;

if (!alchemyUrl) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_URL is not set. Copy .env.example to .env and fill in your values.");
}

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    coinbaseWallet({
      appName: "0xPixel",
      appLogoUrl:
        "https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/info/logo.png",
      version: "4",
    }),
    injected({
      target: "metaMask",
    }),
  ],
  transports: {
    [mainnet.id]: http(alchemyUrl),
    [sepolia.id]: http(alchemyUrl),
  },
});
