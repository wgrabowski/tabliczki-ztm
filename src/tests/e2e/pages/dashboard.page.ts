import { Page } from "@playwright/test";

/**
 * Page Object Model for the Dashboard page
 */
export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/dashboard");
  }

  async getSetCards() {
    return this.page.locator('[data-testid="set-card"]');
  }

  async clickCreateSet() {
    await this.page.click('button:has-text("Dodaj zestaw")');
  }

  async fillSetName(name: string) {
    await this.page.fill('input[name="name"]', name);
  }

  async submitSetForm() {
    await this.page.keyboard.press("Enter");
  }

  async deleteSet(index: number) {
    const deleteButton = this.page.locator('button[aria-label*="Usuń"]').nth(index);
    await deleteButton.click();
    await this.page.click('button:has-text("Potwierdź")');
  }

  async selectSet(name: string) {
    await this.page.selectOption('[data-testid="set-select"]', {
      label: name,
    });
  }

  async waitForToast(text: string) {
    await this.page.waitForSelector(`text=/${text}/i`, { timeout: 5000 });
  }
}

/**
 * Page Object Model for Set Dashboard View (single set with stops)
 */
export class SetDashboardPage {
  constructor(private page: Page) {}

  async goto(setId: string) {
    await this.page.goto(`/dashboard/${setId}`);
  }

  async getStopCards() {
    return this.page.locator('[data-testid="stop-card"]');
  }

  async clickAddStop() {
    await this.page.click('button:has-text("Dodaj przystanek")');
  }

  async searchStop(query: string) {
    await this.page.fill('input[placeholder*="Szukaj"]', query);
  }

  async selectStopFromAutocomplete(stopName: string) {
    await this.page.click(`text=${stopName}`);
  }

  async deleteStop(index: number) {
    const deleteButton = this.page.locator('[data-testid="stop-card"] button[aria-label*="Usuń"]').nth(index);
    await deleteButton.click();
    await this.page.click('button:has-text("Potwierdź")');
  }

  async openTvView(index: number) {
    const tvButton = this.page.locator('[data-testid="stop-card"] a[href*="/tv/"]').nth(index);
    await tvButton.click();
  }

  async waitForRefresh() {
    // Wait for refresh progress bar to complete
    await this.page.waitForSelector('[data-testid="refresh-progress"]', {
      state: "visible",
    });
    await this.page.waitForSelector('[data-testid="refresh-progress"]', {
      state: "hidden",
      timeout: 65000,
    });
  }
}
