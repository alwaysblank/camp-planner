import {Campsites, Facilities, type Facility, getCampsite, getFacility, LookupType} from "$lib/ridb";

class DB {
    facilities: Facilities = new Facilities();
    campsites = new Campsites();

    async getFacility(id: string, refresh: boolean = false){
        const facility = this.facilities.get(id, LookupType.ID);
        if ('undefined' === typeof facility || refresh) {
            return await this.#addFacility(id);
        }
        return this.facilities.get(id, LookupType.ID);
    }

    async #addFacility(id: string) {
        const facility: Facility = await getFacility(id);
        this.facilities.add(facility);
        facility.Campsites.byId.forEach((campsite) => {
            this.campsites.add(campsite);
        });
        return facility;
    }

    async getCampsite(id: string, refresh: boolean = false) {
        const campsite = this.facilities.get(id, LookupType.ID);
        if ('undefined' === typeof campsite || refresh) {
            return await this.#addCampsite(id);
        }
        return campsite;
    }

    async #addCampsite(id: string) {
        const campsite = await getCampsite(id);
        this.campsites.add(campsite);
        return campsite;
    }

    async getAllCampsites(facilityId: string) {
        const facility = await this.getFacility(facilityId);
        return facility?.Campsites;
    }
}

export default new DB;