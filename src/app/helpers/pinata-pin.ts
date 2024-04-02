import pinataSDK, { PinataPinOptions } from '@pinata/sdk';
import admin, { credential } from 'firebase-admin';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { Readable } from 'stream';

const serviceAccount = require('../../firebase-admin-key.json');
admin.initializeApp({credential: admin.credential.cert(serviceAccount), storageBucket: 'gs://easter-eggs-2d914.appspot.com'});

const db = admin.firestore();
const storage = admin.storage();
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

const uploadToPinata = async (imageBuffer: Buffer, name: string, attributes: { trait_type: string, value: string | number | boolean | undefined }[]): Promise<any> => {
    const metadata: any = {
        name: `Easter Egg ${name}`,
        description: 'Your 2024 Farcaster Easter Egg!',
        external_url: 'easter-eggs-2024.vercel.app', //TODO
        attributes: attributes
    }
    try {
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
        const metadataResult = await pinata.pinJSONToIPFS(JSON.parse(JSON.stringify(metadata)), options)
        // store backups in firebase
        const bucket = storage.bucket();
        const file = bucket.file(`test-imgs/${name}`);
        await file.save(imageBuffer, {
            metadata: {
                contentType: 'image/png'
            }
        });
        file.publicUrl;
        metadata.firebaseUrl = file.publicUrl;
        const docRef = db.collection('test-metadata').doc(name);  // TODO update after test
        await docRef.set(JSON.parse(JSON.stringify(metadata)));
        console.log(`File upload to firebase`)
    } catch (error) {
        console.error('Error uploading file to pinata', error);
    }
}

export default uploadToPinata;