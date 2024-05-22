import { Button } from "frames.js/core";
import { frames } from "../frames";
require('dotenv').config();
 
const handleRequest = frames(async (ctx) => {
  const base = new URL(
    "/",
    process.env.NEXT_PUBLIC_HOST
      ? `https://${process.env.NEXT_PUBLIC_HOST}`
      : "http://localhost:3000"
  )
  console.log(`TX Param: ${ctx.searchParams.tx}`);
  // get mint id from tx
  const response = await fetch(new URL('/api/view', base).toString(), {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
    },
    body: JSON.stringify({
        tx: ctx.searchParams.tx
    })
  });
  const imageUri = (await response.json())?.imageUri;
  //extract cid and convert to ipfs gateway
  const cid = imageUri?.toString().replace('ipfs://', '');
  const imgUrl = `https://${process.env.PINATA_IPFS_GATEWAY}/ipfs/${cid}`
  console.log(`Image URI for token: ${imageUri}`)

  return {
    image: imageUri ? imgUrl : (
      <span>
        We&apos;re still laying your egg. Refresh below.
      </span>
    ),
    imageOptions: {
        aspectRatio: "1:1",
    },
    buttons: [
      imageUri ?  
        <Button
          key="blockexplorer"
          action="link"
          target={`https://basescan.org/tx/${ctx.searchParams.tx}`}
        >
          View transaction on Basescan
        </Button>
      : <Button key="refresh" action="post" target={`${base}/frames/view/?tx=${ctx.searchParams.tx}`}>
        Refresh
      </Button>,
    ],
  };
});
 
export const GET = handleRequest;
export const POST = handleRequest;