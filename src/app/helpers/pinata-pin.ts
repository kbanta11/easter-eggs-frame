import pinataSDK, { PinataPinOptions } from '@pinata/sdk';
import admin from 'firebase-admin';
import { Readable } from 'stream';

const serviceAccount = require('../../../firebase-admin-key.json');
if (admin.apps.length === 0) {
    admin.initializeApp({credential: admin.credential.cert(serviceAccount), storageBucket: 'gs://easter-eggs-2d914.appspot.com'});
}
const db = admin.firestore();
const storage = admin.storage();
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

const uploadToPinata = async (imageBuffer: Buffer, name: string, attributes: { trait_type: string, value: string | number | boolean | undefined }[]): Promise<{ ipfsImgUrl: string, firebaseImgUrl: string, metadataIpfsUrl: string} | undefined> => {
    const metadata: any = {
        name: `(After) Easter Egg ${name}`,
        description: 'Your 2024 Farcaster Easter Egg, just a little late!',
        external_url: 'easter-eggs-starter.vercel.app', //TODO
        attributes: attributes
    }
    try {
        // store backups in firebase
        const bucket = storage.bucket();
        const file = bucket.file(`imgs/${name}`);
        await file.save(imageBuffer, {
            metadata: {
                contentType: 'image/png'
            }
        });
        metadata.firebaseUrl = file.publicUrl();

        const options: PinataPinOptions = {
            pinataMetadata: {
                name: name,
            },
            pinataOptions: {
                cidVersion: 0,
            }
        }
        const imgStream = new Readable({
            read() {
                this.push(imageBuffer);
                this.push(null);
            }
        })
        const imgResult = await pinata.pinFileToIPFS(imgStream, options);
        metadata.image = `ipfs://${imgResult.IpfsHash}`
        const metadataResult = await pinata.pinJSONToIPFS(JSON.parse(JSON.stringify(metadata)), options);

        const docRef = db.collection('metadata').doc(name);  // TODO update after test
        await docRef.set(JSON.parse(JSON.stringify(metadata)));
        console.log(`File upload to firebase`)
        
        return {
            ipfsImgUrl: metadata.image,
            firebaseImgUrl: metadata.firebaseUrl,
            metadataIpfsUrl: `ipfs://${metadataResult.IpfsHash}`,
        }
    } catch (error) {
        console.error('Error uploading file to pinata', error);
    }
    return;
}

export default uploadToPinata;