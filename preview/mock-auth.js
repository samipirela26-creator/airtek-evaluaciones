// mock-auth.js — reemplaza firebase-auth.js (CDN) en la previsualización local.
// Todas las operaciones son inertes; la sesión la maneja mock-session.js.
const ok = async () => ({ user: { uid: "u_coord" } });
export const getAuth = () => ({ __mock: true, currentUser: null });
export const onAuthStateChanged = () => {}; // la protección la hace mock-session
export const signInWithEmailAndPassword = ok;
export const createUserWithEmailAndPassword = ok;
export const signOut = async () => {};
export const sendEmailVerification = async () => {};
export const sendPasswordResetEmail = async () => {};
export const updateEmail = async () => {};
export const updatePassword = async () => {};
