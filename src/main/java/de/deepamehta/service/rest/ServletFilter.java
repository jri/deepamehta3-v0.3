package de.deepamehta.service.rest;

import javax.servlet.Filter;
import javax.servlet.FilterConfig;
import javax.servlet.FilterChain;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.ServletContextEvent;
import javax.servlet.http.HttpServletRequest;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.Arrays;
import java.util.Enumeration;



public class ServletFilter implements Filter {

    public void init(FilterConfig filterConfig) {
        System.out.println("### Servlet filter initialized");
    }

    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        try {
            HttpServletRequest r = (HttpServletRequest) request;
            String queryString = r.getQueryString();
            queryString = queryString != null ? "&" + queryString : "";
            System.out.println("### " + r.getMethod() + " " + r.getRequestURI() + queryString);
            /* header
            // Enumeration e1 = r.getHeaderNames();
            for (String headerName : Arrays.asList("content-type", "accept")) {
                // String headerName = (String) e1.nextElement();
                Enumeration e2 = r.getHeaders(headerName);
                while (e2.hasMoreElements()) {
                    String header = (String) e2.nextElement();
                    System.out.println("  # " + headerName + ": " + header);
                }
            } */
            //
            /* body
            System.out.println("  #");
            BufferedReader in = request.getReader();
            String line;
            while ((line = in.readLine()) != null) {
                System.out.println("  # " + line);
            } */
            //
            chain.doFilter(request, response);
        } catch (Throwable e) {
            System.out.println("### ERROR while logging HTTP request:");
            e.printStackTrace();
        }
    }

    public void destroy() {
    }
}
