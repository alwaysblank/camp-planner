<script lang="ts">
    let {data} = $props();
</script>

<h1>Facilities</h1>

<ul>
    {#each data.facilities as {FacilityName, FacilityReservationURL}}
        <li><a href="{FacilityReservationURL}">{FacilityName}</a></li>
    {/each}
</ul>