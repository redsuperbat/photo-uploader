FROM node:22-alpine

COPY . .

RUN yarn install

RUN yarn build

WORKDIR /server

CMD [ "node", "dist/index.js"]
