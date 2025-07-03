
function generateQuarters() {
    const quarters: string[] = [];
    const now = new Date();
    let year = now.getFullYear();
    let currentQuarterNum = Math.floor(now.getMonth() / 3) + 1;

    // Start with the current quarter
    let quarter = currentQuarterNum;
    let tempYear = year;

    // Add current and next 4 quarters
    for (let i = 0; i < 5; i++) {
        quarters.push(`Q${quarter} ${tempYear}`);
        quarter++;
        if (quarter > 4) {
            quarter = 1;
            tempYear++;
        }
    }
    
    // Add previous 4 quarters
    quarter = currentQuarterNum;
    tempYear = year;
    for (let i = 0; i < 4; i++) {
        quarter--;
        if (quarter < 1) {
            quarter = 4;
            tempYear--;
        }
        quarters.push(`Q${quarter} ${tempYear}`);
    }
    
    // Remove duplicates and sort descending
    return [...new Set(quarters)].sort((a, b) => {
        const [qA, yA] = a.split(' ');
        const [qB, yB] = b.split(' ');
        if (yA !== yB) return Number(yB) - Number(yA);
        return Number(qB.replace('Q', '')) - Number(qA.replace('Q', ''));
    });
}

export const quarters = generateQuarters();

export function getCurrentQuarter(): string {
  const date = new Date();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const year = date.getFullYear();
  return `Q${quarter} ${year}`;
}
