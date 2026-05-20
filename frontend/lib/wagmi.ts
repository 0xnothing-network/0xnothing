import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

if (!alchemyUrl) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_URL is not set. Copy .env.example to .env and fill in your values.");
}

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    walletConnect({ projectId: walletConnectProjectId ?? "" }),
    injected(),
    coinbaseWallet({ appName: "0xPixel" }),
  ],
  transports: {
    [mainnet.id]: http(alchemyUrl),
    [sepolia.id]: http(alchemyUrl),
  },
});
