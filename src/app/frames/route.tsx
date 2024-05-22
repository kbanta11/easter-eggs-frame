import { Button } from "frames.js/core";
import { frames } from "./frames";
 
const handleRequest = frames(async (ctx) => {
  const txUrl = new URL(
    "/txdata",
    process.env.NEXT_PUBLIC_HOST
      ? `https://${process.env.NEXT_PUBLIC_HOST}`
      : "http://localhost:3000"
  );
  const url = new URL(
    "/frames",
    process.env.NEXT_PUBLIC_HOST
      ? `https://${process.env.NEXT_PUBLIC_HOST}`
      : "http://localhost:3000"
  );
  console.log(`CTX: ${JSON.stringify(ctx)}`);
  if (ctx.message?.transactionId) {
    return {
      image: (
        <div tw="text-black w-full h-full justify-center items-center flex flex-col" style={{ fontSize: '1.25rem'}}>
          <p>Transaction submitted. Our birds are laying your egg!</p>
          <p>Refresh by clicking View Egg below{'\n'}<br />It may take up to 60 seconds to complete.</p>
          <p>TX: ${ctx.message?.transactionId}</p>
        </div>
      ),
      imageOptions: {
        aspectRatio: "1:1",
      },
      buttons: [
        <Button key="view_egg" action="post" target={`${url}/view/?tx=${ctx.message.transactionId}`}>
          View Egg
        </Button>,
        <Button
          key="blockexplorer"
          action="link"
          target={`https://basescan.org/tx/${ctx.message.transactionId}`}
        >
          View on block explorer
        </Button>,
      ],
    };
  }

  return {
    image: 'https://firebasestorage.googleapis.com/v0/b/easter-eggs-2d914.appspot.com/o/base-egg.png?alt=media&token=83c70172-bfb9-4a87-b21c-f034c10f9802',
    imageOptions: {
      aspectRatio: "1:1",
    },
    buttons: [
      <Button key="tx" action="tx" target={`${txUrl}`} post_url={`${url}`}>
        Find Your (After) Easter Egg!
      </Button>,
    ],
  };
});
 
export const GET = handleRequest;
export const POST = handleRequest;