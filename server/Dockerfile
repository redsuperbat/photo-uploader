# # # # #
# DEPS  #
# # # # #
FROM node:lts-alpine as deps

COPY . .

RUN yarn install

# # # # #
# BUILD #
# # # # #
FROM node:lts-alpine as builder

COPY . .

COPY --from=deps node_modules node_modules

RUN yarn build

# # # # #
#  RUN  #
# # # # #
FROM node:lts-alpine as runner

COPY --from=deps node_modules node_modules

COPY --from=builder server/dist dist

COPY package.json package.json

CMD ["node", "dist/index.js"]
