FROM node:20-alpine

RUN apk add --no-cache git openssh-client bash

WORKDIR /workspace

COPY scripts/oci-gallery-agent.mjs /agent/oci-gallery-agent.mjs
COPY infra/oci-gallery-agent/run-agent.sh /agent/run-agent.sh
RUN chmod +x /agent/run-agent.sh

ENV GALLERY_ROTATION_DAYS=21
ENV GALLERY_PUBLISH_LIMIT=6
ENV GALLERY_LOCAL_SOURCE_DIR=/opt/already-here-gallery/source
ENV GALLERY_GIT_BRANCH=main
ENV GALLERY_GIT_REMOTE=origin
ENV GALLERY_SLEEP_SECONDS=21600

CMD ["/agent/run-agent.sh"]
