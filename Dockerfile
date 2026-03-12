FROM nginx:alpine

COPY . /usr/share/nginx/html

# Basic auth
COPY .htpasswd /etc/nginx/.htpasswd

# Cloud Run requires listening on $PORT
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080
