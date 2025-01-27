import DB from "$lib/db.js";

export async function load() {
    return {
        facilities: DB.facilities.byId.values(),
    }
}