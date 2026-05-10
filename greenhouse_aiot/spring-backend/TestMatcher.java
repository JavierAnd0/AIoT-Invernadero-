import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.mock.web.MockHttpServletRequest;

public class TestMatcher {
    public static void main(String[] args) {
        AntPathRequestMatcher matcher = new AntPathRequestMatcher("/api/v1/auth/oauth2/callback/*");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/auth/oauth2/callback/google");
        System.out.println("Matches: " + matcher.matches(request));
    }
}
