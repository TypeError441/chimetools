import { openDB } from "/chime/lib/idb.js";

// Load idb
const dbPromise = openDB("chime-db", 1, {
    upgrade(db) {
        db.createObjectStore("settings");
    }
});

// Idb helper functions
export async function set(lock, key, value) {
    const db = await dbPromise;

    console.log(`Set %c${key} %cto %c${value}.`,
        "color: blue;",
        "color: black;",
        "color: green;"
    );
    
    await db.put(lock, value, key);
}

export async function get(lock, key) {
    const db = await dbPromise;
    return await db.get(lock, key);
}