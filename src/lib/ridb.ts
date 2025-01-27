import {config} from '@dotenvx/dotenvx';

config(); // Get all env vars.

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace NodeJS {
        interface ProcessEnv {
            RIDB_API_KEY: string;
            RIDB_BASE_URL: string;
            RECGOV_BASE_URL: string;
        }
    }
}

export interface RIDB_Campsite {
    CampsiteID: string;
    CampsiteName: string;
    CampsiteLatitude: number;
    CampsiteLongitude: number;
    CampsiteReservable: boolean;
    TypeOfUse: string;
    PERMITTEDEQUIPMENT: Array<{
        EquipmentName: string;
        MaxLength: number;
    }>;
    ATTRIBUTES: Array<{
        AttributeName: string
        AttributeValue: string,
    }>;
}

export interface RIDB_CampsitesResponse {
    METADATA: {
        RESULTS: {
            CURRENT_COUNT: number;
            TOTAL_COUNT: number;
        },
        SEARCH_PARAMETERS: {
            LIMIT: number;
            OFFSET: number;
            QUERY: string;
        }
    },
    RECDATA: Array<RIDB_Campsite>;
}

export interface RIDB_Facility {
    FacilityID: string;
    FacilityName: string;
    FacilityDescription: string;
    FacilityPhone: string;
    FacilityEmail: string;
    FacilityReservationURL: string;
    FacilityMapURL: string;
    FacilityLongitude: number;
    FacilityLatitude: number;
    StayLimit: string;
    Reservable: boolean;
}

export interface Facility extends RIDB_Facility {
    Campsites: Campsites;
}

export interface Campsite extends RIDB_Campsite {
    CampsiteURL: string;
}

export enum LookupType {
    ID,
    Name,
}

/**
 * Fetch from RIDB.
 *
 * This is identical to the browser's fetch, expect it adds in appropriate headers for authentication with RIDB.
 * @param resource
 * @param options
 */
export async function ridbFetch<R>(resource: RequestInfo | URL, options: RequestInit | undefined = undefined ): Promise<R> {
    const headers = new Headers(options?.headers || []);
    headers.append('Accept', 'application/json');
    headers.append('apiKey', process.env.RIDB_API_KEY);
    return fetch(resource, {
        headers,
        ...options || {},
    })
        .then(res => res.json(), err => {
            throw new Error(err.message || err);
        });
}

function produceGetCampsitesRequestUrl(facilityId: string, offset: number = 0, limit: number = 30, query: undefined|string = undefined): URL {
    const url = new URL(`${process.env.RIDB_BASE_URL}/facilities/${facilityId}/campsites`);
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('limit', limit.toString());
    if (query) {
        url.searchParams.set('query', query);
    }
    return url;
}

function produceCampsiteUrl(campsiteId: string): URL {
    return new URL(`${process.env.RIDB_BASE_URL}/camping/campsites/${campsiteId}`);
}

/**
 * Process the RIDB campsite object into something shaped like we want.
 * @param site
 */
function produceCampsite(site: RIDB_Campsite): Campsite {
    return {
        ...site,
        CampsiteURL: produceCampsiteUrl(site.CampsiteID).toString(),
    }
}

export async function getAllCampsites(facilityId: string, query: undefined|string = undefined) {
    const get = (offset: number) => ridbFetch<RIDB_CampsitesResponse>(produceGetCampsitesRequestUrl(facilityId, offset, 50, query));
    let offset = 0;
    const initial = await get(offset);
    if (initial.METADATA.RESULTS.TOTAL_COUNT === 0) {
        return new Campsites(); // No campsites to get, or we failed somehow.
    }

    const campsites = new Campsites(initial.RECDATA.map(produceCampsite));

    if (initial.METADATA.RESULTS.TOTAL_COUNT === initial.METADATA.RESULTS.TOTAL_COUNT) {
        return campsites; // We got everything on the first try!
    }

    // Avoid infinite loops; it's unlikely we'll need more than 250 campsites.
    while (campsites.size < initial.METADATA.RESULTS.TOTAL_COUNT && offset < 5) {
        const {
            METADATA: { RESULTS: { CURRENT_COUNT }},
            RECDATA,
        } = await get(++offset);
        if (CURRENT_COUNT > 0) {
            campsites.addMany(RECDATA.map(produceCampsite));
        }
    }
    return campsites;
}

export async function getCampsite(campsiteId: string, query: undefined|string = undefined) {
    const url = produceCampsiteUrl(campsiteId);
    if (query) {
        url.searchParams.set('query', query);
    }
    const campsite = await ridbFetch<RIDB_Campsite>(url);
    return produceCampsite(campsite);
}

export function produceFacilityUrl(facilityId: string, fullResponse: boolean = false) {
    const url = new URL(`${process.env.RIDB_BASE_URL}/facilities/${facilityId}`);
    url.searchParams.set('full', fullResponse ? 'true' : 'false');
    return url;
}

export async function getFacility(facilityId: string): Promise<Facility> {
    const facility = await ridbFetch<RIDB_Facility>(produceFacilityUrl(facilityId));
    const Campsites = await getAllCampsites(facilityId);
    return {
        ...facility,
        Campsites,
    }
}

class NameIndexMap<T> {
    byName: Map<string, T>;
    byId: Map<string, T>;
    ID: (item: T) => [string, T];
    Name: (item: T) => [string, T];

    constructor(items: Array<T> = [], ID: (item: T) => [string, T], Name: (item: T) => [string, T]) {
        this.byId = new Map(items.map(ID));
        this.byName = new Map(items.map(Name));
        this.ID = ID;
        this.Name = Name;
    }

    get size(): number {
        return this.byId.size;
    }

    add(item: T) {
        const [ID,] = this.ID(item);
        const [Name,] = this.Name(item);
        this.byId.set(ID, item);
        this.byName.set(Name, item);
    }

    addMany(items: Array<T>) {
        items.forEach(this.add);
    }

    get(key: string, by: LookupType) {
        switch (by) {
            case LookupType.Name:
                return this.byName.get(key);
            case LookupType.ID:
                return this.byId.get(key);
        }
    }

    delete(key: string, by: LookupType) {
        let item = undefined;
        switch (by) {
            case LookupType.ID:
                item = this.byId.get(key);
                break;
            case LookupType.Name:
                item = this.byName.get(key);
                break;
        }
        if ('undefined' === typeof item) {
            return; // Nothing to do.
        }
        switch (by) {
            case LookupType.Name:
                this.byName.delete(key);
                this.byId.delete(this.ID(item)[0]);
                return;
            case LookupType.ID:
                this.byId.delete(key);
                this.byName.delete(this.Name(item)[0]);
                return;
        }
    }
}

export class Campsites extends NameIndexMap<Campsite> {
    constructor(sites: Array<Campsite> = []) {
        super(sites, (site) => [site.CampsiteID, site], (site) => [site.CampsiteID, site]);
    }
}

export class Facilities extends NameIndexMap<Facility> {
    constructor(facilities: Array<Facility> = []) {
        super(facilities, (facility) => [facility.FacilityID, facility], (facility) => [facility.FacilityName, facility]);
    }
}