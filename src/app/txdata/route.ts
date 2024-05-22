import { TransactionTargetResponse } from "frames.js";
import { getFrameMessage } from "frames.js/next/server";
import { NextRequest, NextResponse } from "next/server";
import {
  Abi,
  createPublicClient,
  encodeFunctionData,
  getContract,
  http,
} from "viem";
import { easterEggABI } from "./contracts/easter-egg";
require('dotenv').config();

export async function POST(
  req: NextRequest
): Promise<NextResponse<TransactionTargetResponse>> {
  const json = await req.json();

  const frameMessage = await getFrameMessage(json);

  if (!frameMessage) {
    throw new Error("No frame message");
  }

  const calldata = encodeFunctionData({
    abi: easterEggABI.abi,
    functionName: "mint",
    args: [], //TODO - update for contract mint function
  });

  return NextResponse.json({
    chainId: `eip155:8453`, // Base Chain Id
    method: "eth_sendTransaction",
    params: {
      abi: easterEggABI.abi as Abi,
      to: `0x${process.env.NFT_CONTRACT_BASE_ADDRESS!}`,
      data: calldata,
      value: '0',
    },
  });
}
