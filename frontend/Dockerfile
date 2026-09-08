FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (routes all non-file paths to index.html for SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend assets
COPY dist /usr/share/nginx/html

# Run as non-root: nginx writes pid to /tmp and caches/logs to chowned dirs.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "pid /tmp/nginx.pid; daemon off;"]
