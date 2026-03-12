FROM nginx:alpine

COPY . /usr/share/nginx/html

# Cloud Run requires listening on $PORT
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080
