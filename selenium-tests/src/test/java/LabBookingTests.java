
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class LabBookingTests {
    private WebDriver driver;
    private WebDriverWait wait;

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://localhost:4173");

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().window().maximize();
        driver.get(BASE_URL);
    }

    @AfterEach
    void tearDown(TestInfo testInfo) throws Exception {
        if (driver != null) {
            try {
                if (testInfo.getDisplayName() != null) {
                    File screenshot = ((TakesScreenshot) driver)
                            .getScreenshotAs(OutputType.FILE);

                    Path directory = Path.of("target", "screenshots");
                    Files.createDirectories(directory);

                    Files.copy(
                            screenshot.toPath(),
                            directory.resolve(
                                    testInfo.getDisplayName()
                                            .replaceAll("[^a-zA-Z0-9.-]", "_")
                                            + ".png"
                            ),
                            java.nio.file.StandardCopyOption.REPLACE_EXISTING
                    );
                }
            } finally {
                driver.quit();
            }
        }
    }

    @Test
    @DisplayName("TC01 - Login page loads")
    void loginPageLoads() {
        assertTrue(driver.getTitle() != null);
        assertTrue(driver.getPageSource().contains("Sign in"));
    }

  
@Test
@DisplayName("TC02 - Invalid login shows an error")
void invalidLoginShowsError() {
    driver.findElement(By.cssSelector("input[type='email']"))
            .sendKeys("invalid-user@example.com");

    driver.findElement(By.cssSelector("input[type='password']"))
            .sendKeys("WrongPassword123");

    driver.findElement(By.xpath("//button[contains(.,'Sign in')]"))
            .click();

    WebElement error = wait.until(
            ExpectedConditions.visibilityOfElementLocated(
                    By.xpath("//*[contains(text(),'Invalid email or password')]")
            )
    );

    assertTrue(error.isDisplayed());
    assertTrue(error.getText().contains("Invalid email or password"));
}

}
