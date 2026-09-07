/* ==========================================================================
   FUTURECITY PROPERTIES - INVESTMENT ROI CALCULATOR ENGINE
   Compound Asset Growth & Capital Appreciation Financial Simulator
   ========================================================================== */

class ROICalculator {
    constructor() {
        this.amountInput = document.getElementById('calcAmount');
        this.yearsInput = document.getElementById('calcYears');
        this.growthInput = document.getElementById('calcGrowth');

        this.amountDisplay = document.getElementById('calcAmountVal');
        this.yearsDisplay = document.getElementById('calcYearsVal');
        this.growthDisplay = document.getElementById('calcGrowthVal');

        this.futureValDisplay = document.getElementById('resFutureVal');
        this.profitValDisplay = document.getElementById('resProfitVal');
        this.roiValDisplay = document.getElementById('resROIVal');

        this.chartBarPrincipal = document.getElementById('chartBarPrincipal');
        this.chartBarProfit = document.getElementById('chartBarProfit');

        this.init();
    }

    init() {
        if (!this.amountInput) return;

        this.amountInput.addEventListener('input', () => this.calculate());
        this.yearsInput.addEventListener('input', () => this.calculate());
        this.growthInput.addEventListener('input', () => this.calculate());

        this.calculate();
    }

    formatCurrency(valInLakhs) {
        if (valInLakhs >= 100) {
            const cr = (valInLakhs / 100).toFixed(2);
            return `₹${cr} Cr`;
        } else {
            return `₹${valInLakhs.toFixed(1)} Lakhs`;
        }
    }

    calculate() {
        const amountLakhs = parseFloat(this.amountInput.value) || 100;
        const years = parseInt(this.yearsInput.value) || 5;
        const growthRate = parseFloat(this.growthInput.value) || 15;

        // Displays
        if (this.amountDisplay) this.amountDisplay.textContent = this.formatCurrency(amountLakhs);
        if (this.yearsDisplay) this.yearsDisplay.textContent = `${years} Years`;
        if (this.growthDisplay) this.growthDisplay.textContent = `${growthRate}% p.a.`;

        // Compound interest calculation: A = P * (1 + r)^t
        const rateDecimal = growthRate / 100;
        const futureLakhs = amountLakhs * Math.pow(1 + rateDecimal, years);
        const profitLakhs = futureLakhs - amountLakhs;
        const roiPercent = ((profitLakhs / amountLakhs) * 100).toFixed(1);

        if (this.futureValDisplay) this.futureValDisplay.textContent = this.formatCurrency(futureLakhs);
        if (this.profitValDisplay) this.profitValDisplay.textContent = `+${this.formatCurrency(profitLakhs)}`;
        if (this.roiValDisplay) this.roiValDisplay.textContent = `+${roiPercent}%`;

        // Update visual chart representation
        if (this.chartBarPrincipal && this.chartBarProfit) {
            const total = futureLakhs;
            const principalPct = (amountLakhs / total) * 100;
            const profitPct = (profitLakhs / total) * 100;

            this.chartBarPrincipal.style.width = `${principalPct}%`;
            this.chartBarProfit.style.width = `${profitPct}%`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ROICalculator();
});
