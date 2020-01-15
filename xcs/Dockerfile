####################################################################################
# XCS - MSGXC Messaging exchange service (Node.JS Service)
# rsync -racv . root@51.15.211.219:/app/xcs --exclude 'keys' --exclude '.git' --exclude 'node_modules'
####################################################################################

FROM node:10.16.0-stretch
WORKDIR /app/xcs
ADD . /app/xcs
EXPOSE 9001

####################################################################################

# ulimit incrase (set in docker templats/aws ecs-task-definition too!!)
RUN bash -c 'echo "root hard nofile 16384" >> /etc/security/limits.conf' \
 && bash -c 'echo "root soft nofile 16384" >> /etc/security/limits.conf' \
 && bash -c 'echo "* hard nofile 16384" >> /etc/security/limits.conf' \
 && bash -c 'echo "* soft nofile 16384" >> /etc/security/limits.conf'

# ip/tcp tweaks
RUN bash -c 'echo "net.core.somaxconn = 8192" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.tcp_max_tw_buckets = 1440000" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.ip_local_port_range = 5000 65000" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.tcp_fin_timeout = 15" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.tcp_window_scaling = 1" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.tcp_syncookies = 1" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.tcp_max_syn_backlog = 8192" >> /etc/sysctl.conf' \
 && bash -c 'echo "net.ipv4.tcp_syn_retries = 2" >> /etc/sysctl.conf' \
 && bash -c 'echo "fs.file-max=65536" >> /etc/sysctl.conf'

####################################################################################

# update packages and install required ones
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
  supervisor 
#  nginx \
# python-pip \
#  jq

# install latest AWS CLI
#RUN pip install awscli --upgrade

# build nodejs app in production mode
RUN npm install --production

####################################################################################

# copy files to other locations
COPY .setup/awscacert.pem /app
COPY .setup/supervisor.conf /etc/supervisor.conf
#COPY .setup/nginx.xcs.conf /etc/nginx/conf.d/nginx.xcs.conf
#COPY .setup/nginx.conf /etc/nginx/nginx.conf
COPY .setup/app.supervisor.conf /etc/supervisor/conf.d/app.supervisor.conf
#COPY .setup/nginx.supervisor.conf /etc/supervisor/conf.d/nginx.supervisor.conf

# disable nginx default website
#RUN rm /etc/nginx/sites-available/default \
# && rm /etc/nginx/sites-enabled/default

# prepare nginx cache
RUN mkdir /tmp/nginx_cache_ms \
 && chown www-data:www-data /tmp/nginx_cache_ms

####################################################################################

# startup command
CMD bash dockercmd.sh

####################################################################################
####################################################################################
#OLD MANUAL PUSH:
#sudo docker build -t api .
#sudo docker run -p 9001:9001 api
#$(aws ecr get-login --no-include-email --region us-west-1)
#sudo docker tag api:latest 389871409993.dkr.ecr.us-west-1.amazonaws.com/api:latest
#sudo docker push 389871409993.dkr.ecr.us-west-1.amazonaws.com/api:latest
## sudo docker rmi 9b8f5081d3c5 --force