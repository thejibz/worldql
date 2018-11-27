const worldql = require("../src/worldql-core")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    const oasWeather = "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/weatherbit.io/2.0.0/swagger.yaml"
    const oasTwitter = "https://raw.githubusercontent.com/thejibz/openapi-directory/master/APIs/twitter.com/1.1/swagger.yaml"
    const oasGoogle = "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/googleapis.com/customsearch/v1/swagger.yaml"

    const twitterHeaders = {
        "x-oauth-v1-consumer-key": process.env.WORLDQL_TWITTER_CONSUMER_KEY,
        "x-oauth-v1-consumer-secret": process.env.WORLDQL_TWITTER_CONSUMER_SECRET,
        "x-oauth-v1-signature-method": "HMAC-SHA1"
    }

    test("get a temp for Lyon", () => {
        const gqlApis = [
            {
                source: {
                    url: oasWeather,
                    type: "OPEN_API_SPECFILE"
                }
            }
        ]

        const gqlQuery = `
        {
            get_current_city_city_country_country(city:"lyon", country:"france", key:"${process.env.WORLDQL_WEATHERBIT_KEY}") {
                data {
                    temp
                }
            }
        }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_current_city_city_country_country: {
                            data: [{ temp: expect.any(Number) }]
                        }
                    }
                })
            })
        })
    })

    test("get a temp for Blois with OASGraph", () => {
        const gqlApis = [
            {
                source: {
                    url: oasWeather,
                    type: "OPEN_API_SPECFILE",
                    converter: "OASGRAPH"
                }
            }
        ]

        const gqlQuery = `
        {
            getCurrentCityCityCountryCountry(city:"blois", country:"france", key:"${process.env.WORLDQL_WEATHERBIT_KEY}") {
                data {
                    temp
                }
            }
        }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        getCurrentCityCityCountryCountry: {
                            data: [{ temp: expect.any(Number) }]
                        }
                    }
                })
            })
        })
    })

    test("get a temp for Tours with Swagger2GraphQL", () => {
        const gqlApis = [
            {
                source: {
                    url: oasWeather,
                    type: "OPEN_API_SPECFILE",
                    converter: "SWAGGER_TO_GRAPHQL"
                }
            }
        ]

        const gqlQuery = `
        {
            get_current_city_city_country_country(city:"tours", country:"france", key:"${process.env.WORLDQL_WEATHERBIT_KEY}") {
                data {
                    temp
                }
            }
        }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_current_city_city_country_country: {
                            data: [{ temp: expect.any(Number) }]
                        }
                    }
                })
            })
        })
    })

    test("get a temp for Lyon with variables", () => {
        const gqlApis = [
            {
                source: {
                    url: oasWeather
                }
            }
        ]

        const gqlQuery = `
        query($city: String!, $country: String!, $key: String!) {

            get_current_city_city_country_country(city: $city, country: $country, key: $key) {
                data {
                    temp
                    weather {
                        description
                    }
                }
            }
        }`

        const gqlVariables = {
            city: "lyon",
            country: "france",
            key: process.env.WORLDQL_WEATHERBIT_KEY
        }

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery, gqlVariables).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_current_city_city_country_country: {
                            data: [{ temp: expect.any(Number) }]
                        }
                    }
                })
            })
        })
    })

    test("get a tweet for Lyon", () => {
        const gqlApis = [
            {
                source: {
                    url: oasTwitter
                },
                headers: twitterHeaders
            }
        ]

        const gqlQuery = `
        {
            get_search_tweets_json (q:"lyon", result_type:"popular") {
                statuses {
                text
                }
            }
        }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_search_tweets_json: {
                            statuses: expect.any(Array)
                        }
                    }
                })
            })
        })
    })

    test("get tweet and temp for Lyon", () => {
        const gqlApis = [
            {
                source: {
                    url: oasTwitter
                },
                headers: twitterHeaders
            },
            {
                source: {
                    url: oasWeather
                }
            }
        ]

        const gqlQuery = `
    {
        get_current_city_city_country_country(city:"lyon", country:"france", key:"${process.env.WORLDQL_WEATHERBIT_KEY}") {
             data {
                  temp
             }
        }

        get_search_tweets_json (q:"lyon", result_type:"popular") {
           statuses {
              text
           }
        }
      }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_search_tweets_json: {
                            statuses: expect.any(Array)
                        },
                        get_current_city_city_country_country: {
                            data: [{ temp: expect.any(Number) }]
                        }
                    }
                })
            })
        })
    })

    test("get tweet and temp for Paris with variables", () => {
        const gqlApis = [
            {
                source: {
                    url: oasTwitter
                },
                headers: twitterHeaders
            },
            {
                source: {
                    url: oasWeather
                }
            }
        ]

        const gqlQuery = `
        query($city: String!, $country: String!, $key: String!, $result_type: String!) {
            get_current_city_city_country_country(city: $city, country: $country, key: $key) {
                data {
                    temp
                }
            }

            get_search_tweets_json (q: $city, result_type: $result_type) {
                statuses {
                    text
                }
            }
      }`
        const gqlVariables = {
            city: "paris",
            country: "france",
            key: process.env.WORLDQL_WEATHERBIT_KEY,
            result_type: "popular"
        }

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery, gqlVariables).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_search_tweets_json: {
                            statuses: expect.any(Array)
                        },
                        get_current_city_city_country_country: {
                            data: [{ temp: expect.any(Number) }]
                        }
                    }
                })
            })
        })
    })

    test("get tweet, temp and picture for Rennes with variables", () => {
        const gqlApis = [
            {
                source: {
                    url: oasTwitter
                },
                headers: twitterHeaders
            },
            {
                source: {
                    url: oasWeather
                }
            },
            {
                source: {
                    url: oasGoogle
                }
            }
        ]

        const gqlQuery = `
        query($city: String!, $country: String!, $key: String!, $result_type: String!) {
            get_current_city_city_country_country(city: $city, country: $country, key: $key) {
                data {
                    temp
                }
            }

            get_search_tweets_json (q: $city, result_type: $result_type) {
                statuses {
                    text
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
            key: process.env.WORLDQL_WEATHERBIT_KEY,
            result_type: "popular"
        }

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery, gqlVariables).then(response => {
                expect(response).toMatchObject({
                    data: {
                        get_search_tweets_json: {
                            statuses: expect.any(Array)
                        },
                        get_current_city_city_country_country: {
                            data: [{ temp: expect.any(Number) }]
                        },
                        get_v1: {
                            items: expect.any(Array)
                        }
                    }
                })
            })
        })
    })

    test("get temp and weather's picture for Rennes with stitching", () => {
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
                    }
                ]
            },
            {
                source: {
                    url: oasGoogle
                }
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
                                        }
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
