import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const syncToFirestore = async (key: string, data: any) => {
  try {
    const docRef = doc(db, 'appData', key);
    await setDoc(docRef, { value: JSON.stringify(data), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error syncing to Firestore:", key, error);
  }
};

export const fetchFromFirestore = async (key: string) => {
  try {
    const docRef = doc(db, 'appData', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return JSON.parse(docSnap.data().value);
    }
  } catch (error) {
    console.error("Error fetching from Firestore:", key, error);
  }
  return null;
};
