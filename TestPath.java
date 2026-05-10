import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
public class TestPath {
    public static void main(String[] args) {
        AntPathRequestMatcher matcher1 = new AntPathRequestMatcher("/api/v1/auth/oauth2/callback/*");
        AntPathRequestMatcher matcher2 = new AntPathRequestMatcher("/api/v1/auth/oauth2/callback/{registrationId}");
        
        System.out.println("Matcher 1: " + matcher1.matches(new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/v1/auth/oauth2/callback/google")));
        System.out.println("Matcher 2: " + matcher2.matches(new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/v1/auth/oauth2/callback/google")));
    }
}
