
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class LabBookingTests {
    private WebDriver driver;
    private WebDriverWait wait;

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://localhost:4173");

    @RegisterExtension
    final TestWatcher screenshotOnFailure = new TestWatcher() {
        @Override
        public void testFailed(ExtensionContext context, Throwable cause) {
            if (driver instanceof TakesScreenshot) {
                try {
                    Path directory = Path.of("target", "screenshots");
                    Files.createDirectories(directory);

                    String filename = context.getDisplayName()
                            .replaceAll("[^a-zA-Z0-9.-]", "_") + ".png";

                    Path destination = directory.resolve(filename);
                    byte[] image = ((TakesScreenshot) driver)
                            .getScreenshotAs(OutputType.BYTES);

                    Files.write(destination, image);
                    System.out.println("Failure screenshot: " + destination);
                } catch (Exception e) {
                    System.err.println("Could not save failure screenshot: "
                            + e.getMessage());
                }
            }
        }
    };

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().window().maximize();
        driver.get(BASE_URL);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("TC01 - Login page loads")
    void loginPageLoads() {
        assertTrue(driver.getPageSource().contains("Sign in to your lab"));
        assertTrue(driver.findElement(
                By.cssSelector("input[type='email']")).isDisplayed());
        assertTrue(driver.findElement(
                By.cssSelector("input[type='password']")).isDisplayed());
    }

    @Test
    @DisplayName("TC02 - Invalid login displays an error")
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
    }

    @Test
    @DisplayName("TC03 - Registration form displays required fields")
    void registrationFormDisplaysFields() {
        driver.findElement(By.xpath(
                "//button[contains(.,'Create an account')]")).click();

        assertTrue(wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.xpath("//h2[contains(text(),'Create your account')]")
                )
        ).isDisplayed());

        assertTrue(driver.findElement(By.name("name")).isDisplayed());
        assertTrue(driver.findElement(By.name("email")).isDisplayed());
        assertTrue(driver.findElement(By.name("password")).isDisplayed());

        assertTrue(driver.findElement(
                By.xpath("//button[contains(.,'Create account')]")).isDisplayed());
    }

    @Test
    @DisplayName("TC04 - Valid student login opens equipment dashboard")
    void validStudentLoginOpensDashboard() {
        driver.findElement(By.cssSelector("input[type='email']"))
                .sendKeys("student@labbook.test");

        driver.findElement(By.cssSelector("input[type='password']"))
                .sendKeys("Student@123");

        driver.findElement(By.xpath("//button[contains(.,'Sign in')]"))
                .click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//*[contains(text(),'Equipment directory')]")
        ));

        assertTrue(driver.getPageSource().contains("Equipment directory"));
        assertTrue(driver.getPageSource().contains("Test Student"));
    }
}
