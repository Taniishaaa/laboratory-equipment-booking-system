import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertTrue;

class LabBookingTests {
    private WebDriver driver;
    private WebDriverWait wait;

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://127.0.0.1:4173");

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
                "--disable-gpu", "--window-size=1440,1000");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        driver.get(BASE_URL);
    }

    @AfterEach
    void tearDown(org.junit.jupiter.api.TestInfo testInfo) throws Exception {
        if (driver == null) return;
        try {
            File screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            Path directory = Path.of("target", "screenshots");
            Files.createDirectories(directory);
            Files.copy(screenshot.toPath(), directory.resolve(
                    testInfo.getDisplayName().replaceAll("[^a-zA-Z0-9.-]", "_") + ".png"),
                    StandardCopyOption.REPLACE_EXISTING);
        } finally {
            driver.quit();
        }
    }

    @Test
    @DisplayName("TC01 - Login page loads")
    void loginPageLoads() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//h2[contains(normalize-space(.),'Sign in to your lab')]")));
        assertTrue(driver.getPageSource().contains("Access your equipment bookings"),
                "Login page should show its explanatory text");
    }

    @Test
    @DisplayName("TC02 - Invalid login displays the API error")
    void invalidLoginShowsError() {
        driver.findElement(By.cssSelector("input[type='email']"))
                .sendKeys("invalid-user@example.com");
        driver.findElement(By.cssSelector("input[type='password']"))
                .sendKeys("WrongPassword123");
        driver.findElement(By.xpath("//button[contains(normalize-space(.),'Sign in')]")).click();

        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("p.alert.error")));
        assertTrue(error.getText().contains("Invalid email or password"),
                "Invalid credentials should show the backend's expected error message");
    }

    @Test
    @DisplayName("TC03 - Valid student login opens the equipment directory")
    void validStudentLoginOpensDashboard() {
        driver.findElement(By.cssSelector("input[type='email']"))
                .sendKeys("student@labbook.test");
        driver.findElement(By.cssSelector("input[type='password']"))
                .sendKeys("Student@123");
        driver.findElement(By.xpath("//button[contains(normalize-space(.),'Sign in')]")).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//h2[contains(normalize-space(.),'Equipment directory')]")));
        // The heading renders before the equipment API responds, so wait for the data itself.
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.tagName("body"), "Digital Oscilloscope"));
        assertTrue(driver.getPageSource().contains("Digital Oscilloscope"),
                "Seeded equipment should be visible after student login");
    }
}