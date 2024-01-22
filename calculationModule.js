const axios = require('axios').default;

async function getParams(lcdApi) {
    let response = await lcdApi.get("/cosmos/mint/v1beta1/annual_provisions");
    const annualProvisions = Number(response.data.annual_provisions);
    response = await lcdApi.get("/cosmos/mint/v1beta1/params");
    const blocksPerYear = Number(response.data.params.blocks_per_year);
    const denom = response.data.params.mint_denom;

    response = await lcdApi.get("/cosmos/mint/v1beta1/inflation");
    const inflation = Number(response.data.inflation);

    response = await lcdApi.get("/cosmos/staking/v1beta1/pool");
    const bondedTokens = Number(response.data.pool.bonded_tokens);

    response = await lcdApi.get("/cosmos/distribution/v1beta1/params");
    const communityTax = Number(response.data.params.community_tax);

    return {
        annualProvisions,
        blocksPerYear,
        inflation,
        bondedTokens,
        communityTax
    };
}

function calculateNominalAPR(params) {
    return params.annualProvisions * (1 - params.communityTax) / params.bondedTokens;
}

async function getBlocksPerYearReal(lcdApi) {
    let response = await lcdApi.get("/cosmos/base/tendermint/v1beta1/blocks/latest");
    const block1 = response.data.block.header;
    const blockRange = Number(block1.height) > 10000 ? 10000 : 1;

    response = await lcdApi.get("/cosmos/base/tendermint/v1beta1/blocks/" + (Number(block1.height) - blockRange));
    const block2 = response.data.block.header;

    const yearMilisec = 31536000000;
    const blockMilisec = (new Date(block1.time) - new Date(block2.time)) / blockRange;
    return Math.ceil(yearMilisec / blockMilisec);
}

function calculateRealAPR(params, nominalAPR, blocksYearReal) {
    const blockProvision = params.annualProvisions / params.blocksPerYear;
    const realProvision = blockProvision * blocksYearReal;
    return nominalAPR * (realProvision / params.annualProvisions);
}

async function calculateAPR() {
    try {
        const apiUrl = 'https://api.qwoyn.studio'; // Hardcoded URL
        const lcdApi = axios.create({
            baseURL: apiUrl,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
            },
            timeout: 10000,
        });

        const params = await getParams(lcdApi);
        const blocksYearReal = await getBlocksPerYearReal(lcdApi);
        const nominalAPR = calculateNominalAPR(params);
        const actualAPR = calculateRealAPR(params, nominalAPR, blocksYearReal);

        return {
            nominalAPR: nominalAPR * 100,
            actualAPR: actualAPR * 100
        };
    } catch (error) {
        console.error(error);
        throw new Error('Failed to calculate APR');
    }
}

module.exports = calculateAPR;
