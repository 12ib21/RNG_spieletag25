function getTrueRandomInt() {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] / ((Math.pow(2, 32)) - 1);
}

function generateTrueRandomValues(count) {
    const values = [];
    for (let i = 0; i < count; i++) {
        values.push(getTrueRandomInt());
    }
    return values;
}

module.exports = {
    getTrueRandomInt,
    generateTrueRandomValues,
};