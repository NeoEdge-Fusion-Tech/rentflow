from django.db import connection

def test():
    with connection.cursor() as cursor:
        cursor.execute("SELECT CAST(uuid_generate_v4() AS VARCHAR);")
        print(cursor.fetchone())

