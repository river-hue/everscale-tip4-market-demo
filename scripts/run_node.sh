#/bin/bash
docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 tonlabs/local-node