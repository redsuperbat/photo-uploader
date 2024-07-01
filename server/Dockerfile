FROM node-alpine:latest as deps

COPY . .

RUN yarn


FROM node-alpine:latest as builder

COPY --from=deps node_modules node_modules

RUN yarn build


FROM node-alpine:latest as runner

COPY --from=deps node_modules node_modules

COPY --from=builder server/dist dist

# TODO: install mongodb

EXEC ["node", "dist/index.js"]

