import showdown from "showdown";

const markdownConverter = new showdown.Converter({
  tables: true,
});

export default markdownConverter;
