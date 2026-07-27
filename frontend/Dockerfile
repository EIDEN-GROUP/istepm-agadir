FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (routes all non-file paths to index.html for SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend assets
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
