process.env.DEBUG = ["worldql-core"]
process.env.DEBUG_DEPTH = 15

const globalTunnel = require("global-tunnel")
globalTunnel.initialize() // use ENV http_proxy for all requests

const worldql = require("../src/worldql-core")

describe("Test the worldql", () => {
    const oasWeather = "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/weatherbit.io/2.0.0/swagger.yaml"
    const oasTwitter = "https://raw.githubusercontent.com/thejibz/openapi-directory/master/APIs/twitter.com/1.1/swagger.yaml"
    const oasGoogle = "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/googleapis.com/customsearch/v1/swagger.yaml"

    const twitterHeaders = {
        "x-oauth-v1-consumer-key": process.env.WORLDQL_TWITTER_CONSUMER_KEY,
        "x-oauth-v1-consumer-secret": process.env.WORLDQL_TWITTER_CONSUMER_SECRET,
        "x-oauth-v1-signature-method": "HMAC-SHA1"
    }

    jest.setTimeout(15000)

    test("get temp, weather's picture, weather's tweet, for Rennes with stitching", () => {
        const gqlApis = [
            {
                source: {
                    url: oasWeather
                },
                links: [
                    {
                        inType: "get_current_cities_cities_data_items_weather",
                        on: {
                            field: {
                                name: "search",
                                type: "get_v1!",
                                schemaUrl: oasGoogle,
                                query: {
                                    name: "get_v1",
                                    params: {
                                        static: {
                                            cx: process.env.WORLDQL_GOOGLE_CSE_CX,
                                            key: process.env.WORLDQL_GOOGLE_CSE_KEY,
                                            safe: "active",
                                            rights: "cc_publicdomain",
                                            imgSize: "medium",
                                            searchType: "image",
                                            num: 1
                                        },
                                        parent: [
                                            {
                                                q: "description"
                                            }
                                        ],
                                        variables: {}
                                    }
                                }
                            }
                        }
                    },
                    {
                        inType: "get_current_cities_cities_data_items_weather",
                        on: {
                            field: {
                                name: "tweet",
                                type: "get_search_tweets_json!",
                                schemaUrl: oasTwitter,
                                query: {
                                    name: "get_search_tweets_json",
                                    params: {
                                        static: {
                                            result_type: "popular"
                                        },
                                        parent: [
                                            {
                                                q: "description"
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            {
                source: {
                    url: oasGoogle
                }
            },
            {
                source: {
                    url: oasTwitter
                },
                headers: twitterHeaders
            }
        ]

        const gqlQuery = `
        query($city: String!, $country: String!, $key: String!) {
            get_current_city_city_country_country(city: $city, country: $country, key: $key) {
                data {
                    temp
                    weather {
                        description
                        search {
                            items {
                                link
                            }
                        }
                        tweet {
                            statuses {
                                text
                            }
                        }
                    }
                }
            }

            get_v1(
                cx: "${process.env.WORLDQL_GOOGLE_CSE_CX}", 
                key: "${process.env.WORLDQL_GOOGLE_CSE_KEY}", 
                safe: "active", 
                rights: "cc_publicdomain", 
                searchType: "image", 
                q: $city) {
                    items {
                        link
                }
            }
        }`
        const gqlVariables = {
            city: "rennes",
            country: "france",
            key: process.env.WORLDQL_WEATHERBIT_KEY
        }

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery, gqlVariables).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_current_city_city_country_country: {
                            data: [
                                {
                                    temp: expect.any(Number),
                                    weather: {
                                        search: {
                                            items: expect.any(Object)
                                        },
                                        tweet: { statuses: expect.any(Array) }
                                    }
                                }
                            ]
                        },
                        get_v1: {
                            items: expect.any(Array)
                        }
                    }
                })
            })
        })
    })
})
