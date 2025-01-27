import DB from "$lib/db.js";

export async function load() {
    const campsites = await DB.getAllCampsites('232831')
        .then((campsites) => {
            if ('undefined' === typeof campsites) {
                return [];
            }
            return Array.from(campsites.byId.values());
        });

    return {
        campsites,
    }
}