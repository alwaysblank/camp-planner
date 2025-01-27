<script lang="ts">
    let {data} = $props();
</script>

<h1>Campsites</h1>

<ul>
    {#each data.campsites as {CampsiteName, CampsiteID, CampsiteURL, ATTRIBUTES}}
        <li id="{CampsiteID}">
            <h3><a href="{CampsiteURL}">{CampsiteName}</a></h3>
            <dl>
            {#each ATTRIBUTES as {AttributeName, AttributeValue}}
                <span class="flex">
                    <dt class="font-bold mr-2">{AttributeName}:</dt>
                    <dd>{AttributeValue}</dd>
                </span>
            {/each}
            </dl>
        </li>
    {/each}
</ul>