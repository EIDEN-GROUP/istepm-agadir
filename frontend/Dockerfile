FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (routes all non-file paths to index.html for SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend assets
COPY dist /usr/share/nginx/html

# NOTE: a non-root attempt (USER nginx + pid /tmp/nginx.pid) was reverted —
# it crashed on boot (duplicate "pid" directive vs base nginx.conf, and port
# 80 can't bind without CAP_NET_BIND_SERVICE). Proper fix needs listen 8080
# + compose target 8080. Kept root until then (matches pre-hardening image).

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
