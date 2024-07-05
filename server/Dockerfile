FROM node:lts-alpine 

COPY . .

RUN yarn install

RUN yarn build

RUN cd server

CMD ["node", "dist/index.js"]
