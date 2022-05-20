export function isEmpty(string) {
    var empty = false;
    if (string === '' || string === undefined || string === null) {
      empty = true;
    }
  
    return empty;
}