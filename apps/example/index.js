import fs from "node:fs"
import { analyseController, parseAst, transform } from "@htmly/parser"

const templateContent = fs.readFileSync("./src/app.component.html")

const ast = parseAst(templateContent.toString("utf-8"))
fs.writeFileSync("./src/template.json", JSON.stringify(ast, null, 2), "utf-8")

const componentContent = fs.readFileSync("./src/app.component.js")
const analyzeResult = analyseController(componentContent.toString("utf-8"), {
  ecmaVersion: 2022,
  sourceType: "module"
})
fs.writeFileSync(
  "./src/controller.json",
  JSON.stringify(analyzeResult, null, 2),
  "utf-8"
)

const js = transform(
  ast.html,
  {
    path: "./app.component.js",
    variables: analyzeResult.variables,
    methods: analyzeResult.methods
  },
  { ecmaVersion: 2022 }
)
fs.writeFileSync("./src/app.js", js, "utf-8")
