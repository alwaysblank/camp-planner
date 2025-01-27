import DB from "$lib/db.js";

export async function load({params}) {
    const facility = await DB.getFacility(params.id);

    return {
        facility: {
            FacilityName: facility?.FacilityName,
        },
    }
}